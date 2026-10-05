```fortran
subroutine zgemqr (
        character side,
        character trans,
        integer m,
        integer n,
        integer k,
        complex*16, dimension( lda, * ) a,
        integer lda,
        complex*16, dimension( * ) t,
        integer tsize,
        complex*16, dimension( ldc, * ) c,
        integer ldc,
        complex*16, dimension( * ) work,
        integer lwork,
        integer info
)
```

ZGEMQR overwrites the general real M-by-N matrix C with

SIDE = 'L'     SIDE = 'R'
TRANS = 'N':      Q \* C          C \* Q
TRANS = 'T':      Q\*\*H \* C       C \* Q\*\*H

where Q is a complex unitary matrix defined as the product
of blocked elementary reflectors computed by tall skinny
QR factorization (ZGEQR)

## Parameters
SIDE : CHARACTER\*1 [in]
> = 'L': apply Q or Q\*\*H from the Left;
> = 'R': apply Q or Q\*\*H from the Right.

TRANS : CHARACTER\*1 [in]
> = 'N':  No transpose, apply Q;
> = 'C':  Conjugate transpose, apply Q\*\*H.

M : INTEGER [in]
> The number of rows of the matrix A.  M >=0.

N : INTEGER [in]
> The number of columns of the matrix C. N >= 0.

K : INTEGER [in]
> The number of elementary reflectors whose product defines
> the matrix Q.
> If SIDE = 'L', M >= K >= 0;
> if SIDE = 'R', N >= K >= 0.

A : COMPLEX\*16 array, dimension (LDA,K) [in]
> Part of the data structure to represent Q as returned by ZGEQR.

LDA : INTEGER [in]
> The leading dimension of the array A.
> If SIDE = 'L', LDA >= max(1,M);
> if SIDE = 'R', LDA >= max(1,N).

T : COMPLEX\*16 array, dimension (MAX(5,TSIZE)). [in]
> Part of the data structure to represent Q as returned by ZGEQR.

TSIZE : INTEGER [in]
> The dimension of the array T. TSIZE >= 5.

C : COMPLEX\*16 array, dimension (LDC,N) [in,out]
> On entry, the M-by-N matrix C.
> On exit, C is overwritten by Q\*C or Q\*\*H\*C or C\*Q\*\*H or C\*Q.

LDC : INTEGER [in]
> The leading dimension of the array C. LDC >= max(1,M).

WORK : (workspace) COMPLEX\*16 array, dimension (MAX(1,LWORK)) [out]
> On exit, if INFO = 0, WORK(1) returns the minimal LWORK.

LWORK : INTEGER [in]
> The dimension of the array WORK. LWORK >= 1.
> If LWORK = -1, then a workspace query is assumed. The routine
> only calculates the size of the WORK array, returns this
> value as WORK(1), and no error message related to WORK
> is issued by XERBLA.

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
