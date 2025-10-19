```fortran
subroutine clamswlq (
        character side,
        character trans,
        integer m,
        integer n,
        integer k,
        integer mb,
        integer nb,
        complex, dimension( lda, * ) a,
        integer lda,
        complex, dimension( ldt, * ) t,
        integer ldt,
        complex, dimension( ldc, * ) c,
        integer ldc,
        complex, dimension( * ) work,
        integer lwork,
        integer info
)
```

CLAMSWLQ overwrites the general complex M-by-N matrix C with


SIDE = 'L'     SIDE = 'R'
TRANS = 'N':      Q \* C          C \* Q
TRANS = 'T':      Q\*\*H \* C       C \* Q\*\*H
where Q is a complex unitary matrix defined as the product of blocked
elementary reflectors computed by short wide LQ
factorization (CLASWLQ)

## Parameters
SIDE : CHARACTER\*1 [in]
> = 'L': apply Q or Q\*\*H from the Left;
> = 'R': apply Q or Q\*\*H from the Right.

TRANS : CHARACTER\*1 [in]
> = 'N':  No transpose, apply Q;
> = 'C':  Conjugate transpose, apply Q\*\*H.

M : INTEGER [in]
> The number of rows of the matrix C.  M >=0.

N : INTEGER [in]
> The number of columns of the matrix C. N >= 0.

K : INTEGER [in]
> The number of elementary reflectors whose product defines
> the matrix Q.
> M >= K >= 0;

MB : INTEGER [in]
> The row block size to be used in the blocked LQ.
> M >= MB >= 1

NB : INTEGER [in]
> The column block size to be used in the blocked LQ.
> NB > M.

A : COMPLEX array, dimension [in]
> (LDA,M) if SIDE = 'L',
> (LDA,N) if SIDE = 'R'
> The i-th row must contain the vector which defines the blocked
> elementary reflector H(i), for i = 1,2,...,k, as returned by
> CLASWLQ in the first k rows of its array argument A.

LDA : INTEGER [in]
> The leading dimension of the array A. LDA => max(1,K).

T : COMPLEX array, dimension [in]
> ( M \* Number of blocks(CEIL(N-K/NB-K)),
> The blocked upper triangular block reflectors stored in compact form
> as a sequence of upper triangular blocks.  See below
> for further details.

LDT : INTEGER [in]
> The leading dimension of the array T.  LDT >= MB.

C : COMPLEX array, dimension (LDC,N) [in,out]
> On entry, the M-by-N matrix C.
> On exit, C is overwritten by Q\*C or Q\*\*H\*C or C\*Q\*\*H or C\*Q.

LDC : INTEGER [in]
> The leading dimension of the array C. LDC >= max(1,M).

WORK : (workspace) COMPLEX array, dimension (MAX(1,LWORK)) [out]
> On exit, if INFO = 0, WORK(1) returns the minimal LWORK.

LWORK : INTEGER [in]
> The dimension of the array WORK.
> If MIN(M,N,K) = 0, LWORK >= 1.
> If SIDE = 'L', LWORK >= max(1,NB\*MB).
> If SIDE = 'R', LWORK >= max(1,M\*MB).
> 
> If LWORK = -1, then a workspace query is assumed; the routine
> only calculates the minimal size of the WORK array, returns
> this value as the first entry of the WORK array, and no error
> message related to LWORK is issued by XERBLA.

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
