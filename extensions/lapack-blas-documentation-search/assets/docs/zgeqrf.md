```fortran
subroutine zgeqrf (
        integer m,
        integer n,
        complex*16, dimension( lda, * ) a,
        integer lda,
        complex*16, dimension( * ) tau,
        complex*16, dimension( * ) work,
        integer lwork,
        integer info
)
```

ZGEQRF computes a QR factorization of a complex M-by-N matrix A:

A = Q \* ( R ),
( 0 )

where:

Q is a M-by-M orthogonal matrix;
R is an upper-triangular N-by-N matrix;
0 is a (M-N)-by-N zero matrix, if M > N.

## Parameters
M : INTEGER [in]
> The number of rows of the matrix A.  M >= 0.

N : INTEGER [in]
> The number of columns of the matrix A.  N >= 0.

A : COMPLEX\*16 array, dimension (LDA,N) [in,out]
> On entry, the M-by-N matrix A.
> On exit, the elements on and above the diagonal of the array
> contain the min(M,N)-by-N upper trapezoidal matrix R (R is
> upper triangular if m >= n); the elements below the diagonal,
> with the array TAU, represent the unitary matrix Q as a
> product of min(m,n) elementary reflectors (see Further
> Details).

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,M).

TAU : COMPLEX\*16 array, dimension (min(M,N)) [out]
> The scalar factors of the elementary reflectors (see Further
> Details).

WORK : COMPLEX\*16 array, dimension (MAX(1,LWORK)) [out]
> On exit, if INFO = 0, WORK(1) returns the optimal LWORK.

LWORK : INTEGER [in]
> The dimension of the array WORK.
> LWORK >= 1, if MIN(M,N) = 0, and LWORK >= N, otherwise.
> For optimum performance LWORK >= N\*NB, where NB is
> the optimal blocksize.
> 
> If LWORK = -1, then a workspace query is assumed; the routine
> only calculates the optimal size of the WORK array, returns
> this value as the first entry of the WORK array, and no error
> message related to LWORK is issued by XERBLA.

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
