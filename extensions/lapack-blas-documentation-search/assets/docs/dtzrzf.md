```fortran
subroutine dtzrzf (
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

DTZRZF reduces the M-by-N ( M<=N ) real upper trapezoidal matrix A
to upper triangular form by means of orthogonal transformations.

The upper trapezoidal matrix A is factored as

A = ( R  0 ) \* Z,

where Z is an N-by-N orthogonal matrix and R is an M-by-M upper
triangular matrix.

## Parameters
M : INTEGER [in]
> The number of rows of the matrix A.  M >= 0.

N : INTEGER [in]
> The number of columns of the matrix A.  N >= M.

A : DOUBLE PRECISION array, dimension (LDA,N) [in,out]
> On entry, the leading M-by-N upper trapezoidal part of the
> array A must contain the matrix to be factorized.
> On exit, the leading M-by-M upper triangular part of A
> contains the upper triangular matrix R, and elements M+1 to
> N of the first M rows of A, with the array TAU, represent the
> orthogonal matrix Z as a product of M elementary reflectors.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,M).

TAU : DOUBLE PRECISION array, dimension (M) [out]
> The scalar factors of the elementary reflectors.

WORK : DOUBLE PRECISION array, dimension (MAX(1,LWORK)) [out]
> On exit, if INFO = 0, WORK(1) returns the optimal LWORK.

LWORK : INTEGER [in]
> The dimension of the array WORK.  LWORK >= max(1,M).
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
