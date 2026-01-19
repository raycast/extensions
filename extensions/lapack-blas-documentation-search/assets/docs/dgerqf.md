```fortran
subroutine dgerqf (
        integer m,
        integer n,
        double precision, dimension( lda, * ) a,
        integer lda,
        double precision, dimension( * ) tau,
        double precision, dimension( * ) work,
        integer lwork,
        integer info
)
```

DGERQF computes an RQ factorization of a real M-by-N matrix A:
A = R \* Q.

## Parameters
M : INTEGER [in]
> The number of rows of the matrix A.  M >= 0.

N : INTEGER [in]
> The number of columns of the matrix A.  N >= 0.

A : DOUBLE PRECISION array, dimension (LDA,N) [in,out]
> On entry, the M-by-N matrix A.
> On exit,
> if m <= n, the upper triangle of the subarray
> A(1:m,n-m+1:n) contains the M-by-M upper triangular matrix R;
> if m >= n, the elements on and above the (m-n)-th subdiagonal
> contain the M-by-N upper trapezoidal matrix R;
> the remaining elements, with the array TAU, represent the
> orthogonal matrix Q as a product of min(m,n) elementary
> reflectors (see Further Details).

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,M).

TAU : DOUBLE PRECISION array, dimension (min(M,N)) [out]
> The scalar factors of the elementary reflectors (see Further
> Details).

WORK : DOUBLE PRECISION array, dimension (MAX(1,LWORK)) [out]
> On exit, if INFO = 0, WORK(1) returns the optimal LWORK.

LWORK : INTEGER [in]
> The dimension of the array WORK.
> LWORK >= 1, if MIN(M,N) = 0, and LWORK >= M, otherwise.
> For optimum performance LWORK >= M\*NB, where NB is
> the optimal blocksize.
> 
> If LWORK = -1, then a workspace query is assumed; the routine
> only calculates the optimal size of the WORK array, returns
> this value as the first entry of the WORK array, and no error
> message related to LWORK is issued by XERBLA.

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
