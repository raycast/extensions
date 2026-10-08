```fortran
subroutine sgemlq (
        character side,
        character trans,
        integer m,
        integer n,
        integer k,
        real, dimension( lda, * ) a,
        integer lda,
        real, dimension( * ) t,
        integer tsize,
        real, dimension( ldc, * ) c,
        integer ldc,
        real, dimension( * ) work,
        integer lwork,
        integer info
)
```

SGEMLQ overwrites the general real M-by-N matrix C with

SIDE = 'L'     SIDE = 'R'
TRANS = 'N':      Q \* C          C \* Q
TRANS = 'T':      Q\*\*T \* C       C \* Q\*\*T
where Q is a real orthogonal matrix defined as the product
of blocked elementary reflectors computed by short wide LQ
factorization (SGELQ)

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
> the matrix Q.
> If SIDE = 'L', M >= K >= 0;
> if SIDE = 'R', N >= K >= 0.

A : REAL array, dimension [in]
> (LDA,M) if SIDE = 'L',
> (LDA,N) if SIDE = 'R'
> Part of the data structure to represent Q as returned by SGELQ.

LDA : INTEGER [in]
> The leading dimension of the array A. LDA >= max(1,K).

T : REAL array, dimension (MAX(5,TSIZE)). [in]
> Part of the data structure to represent Q as returned by SGELQ.

TSIZE : INTEGER [in]
> The dimension of the array T. TSIZE >= 5.

C : REAL array, dimension (LDC,N) [in,out]
> On entry, the M-by-N matrix C.
> On exit, C is overwritten by Q\*C or Q\*\*T\*C or C\*Q\*\*T or C\*Q.

LDC : INTEGER [in]
> The leading dimension of the array C. LDC >= max(1,M).

WORK : (workspace) DOUBLE PRECISION array, dimension (MAX(1,LWORK)) [out]
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
