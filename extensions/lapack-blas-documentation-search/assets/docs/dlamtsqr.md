```fortran
subroutine dlamtsqr (
        character side,
        character trans,
        integer m,
        integer n,
        integer k,
        integer mb,
        integer nb,
        double precision, dimension( lda, * ) a,
        integer lda,
        double precision, dimension( ldt, * ) t,
        integer ldt,
        double precision, dimension( ldc, * ) c,
        integer ldc,
        double precision, dimension( * ) work,
        integer lwork,
        integer info
)
```

DLAMTSQR overwrites the general real M-by-N matrix C with


SIDE = 'L'     SIDE = 'R'
TRANS = 'N':      Q \* C          C \* Q
TRANS = 'T':      Q\*\*T \* C       C \* Q\*\*T
where Q is a real orthogonal matrix defined as the product
of blocked elementary reflectors computed by tall skinny
QR factorization (DLATSQR)

## Parameters
SIDE : CHARACTER\*1 [in]
> = 'L': apply Q or Q\*\*T from the Left;
> = 'R': apply Q or Q\*\*T from the Right.

TRANS : CHARACTER\*1 [in]
> = 'N':  No transpose, apply Q;
> = 'T':  Transpose, apply Q\*\*T.

M : INTEGER [in]
> The number of rows of the matrix A.  M >=0.

N : INTEGER [in]
> The number of columns of the matrix C. N >= 0.

K : INTEGER [in]
> The number of elementary reflectors whose product defines
> the matrix Q. M >= K >= 0;

MB : INTEGER [in]
> The block size to be used in the blocked QR.
> MB > N. (must be the same as DLATSQR)

NB : INTEGER [in]
> The column block size to be used in the blocked QR.
> N >= NB >= 1.

A : DOUBLE PRECISION array, dimension (LDA,K) [in]
> The i-th column must contain the vector which defines the
> blockedelementary reflector H(i), for i = 1,2,...,k, as
> returned by DLATSQR in the first k columns of
> its array argument A.

LDA : INTEGER [in]
> The leading dimension of the array A.
> If SIDE = 'L', LDA >= max(1,M);
> if SIDE = 'R', LDA >= max(1,N).

T : DOUBLE PRECISION array, dimension [in]
> ( N \* Number of blocks(CEIL(M-K/MB-K)),
> The blocked upper triangular block reflectors stored in compact form
> as a sequence of upper triangular blocks.  See below
> for further details.

LDT : INTEGER [in]
> The leading dimension of the array T.  LDT >= NB.

C : DOUBLE PRECISION array, dimension (LDC,N) [in,out]
> On entry, the M-by-N matrix C.
> On exit, C is overwritten by Q\*C or Q\*\*T\*C or C\*Q\*\*T or C\*Q.

LDC : INTEGER [in]
> The leading dimension of the array C. LDC >= max(1,M).

WORK : (workspace) DOUBLE PRECISION array, dimension (MAX(1,LWORK)) [out]
> On exit, if INFO = 0, WORK(1) returns the minimal LWORK.

LWORK : INTEGER [in]
> The dimension of the array WORK.
> If MIN(M,N,K) = 0, LWORK >= 1.
> If SIDE = 'L', LWORK >= max(1,N\*NB).
> If SIDE = 'R', LWORK >= max(1,MB\*NB).
> 
> If LWORK = -1, then a workspace query is assumed; the routine
> only calculates the minimal size of the WORK array, returns
> this value as the first entry of the WORK array, and no error
> message related to LWORK is issued by XERBLA.

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
