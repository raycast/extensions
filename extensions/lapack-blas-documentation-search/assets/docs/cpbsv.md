```fortran
subroutine cpbsv (
        character uplo,
        integer n,
        integer kd,
        integer nrhs,
        complex, dimension( ldab, * ) ab,
        integer ldab,
        complex, dimension( ldb, * ) b,
        integer ldb,
        integer info
)
```

CPBSV computes the solution to a complex system of linear equations
A \* X = B,
where A is an N-by-N Hermitian positive definite band matrix and X
and B are N-by-NRHS matrices.

The Cholesky decomposition is used to factor A as
A = U\*\*H \* U,  if UPLO = 'U', or
A = L \* L\*\*H,  if UPLO = 'L',
where U is an upper triangular band matrix, and L is a lower
triangular band matrix, with the same number of superdiagonals or
subdiagonals as A.  The factored form of A is then used to solve the
system of equations A \* X = B.

## Parameters
UPLO : CHARACTER\*1 [in]
> = 'U':  Upper triangle of A is stored;
> = 'L':  Lower triangle of A is stored.

N : INTEGER [in]
> The number of linear equations, i.e., the order of the
> matrix A.  N >= 0.

KD : INTEGER [in]
> The number of superdiagonals of the matrix A if UPLO = 'U',
> or the number of subdiagonals if UPLO = 'L'.  KD >= 0.

NRHS : INTEGER [in]
> The number of right hand sides, i.e., the number of columns
> of the matrix B.  NRHS >= 0.

AB : COMPLEX array, dimension (LDAB,N) [in,out]
> On entry, the upper or lower triangle of the Hermitian band
> matrix A, stored in the first KD+1 rows of the array.  The
> j-th column of A is stored in the j-th column of the array AB
> as follows:
> if UPLO = 'U', AB(KD+1+i-j,j) = A(i,j) for max(1,j-KD)<=i<=j;
> if UPLO = 'L', AB(1+i-j,j)    = A(i,j) for j<=i<=min(N,j+KD).
> See below for further details.
> 
> On exit, if INFO = 0, the triangular factor U or L from the
> Cholesky factorization A = U\*\*H\*U or A = L\*L\*\*H of the band
> matrix A, in the same storage format as A.

LDAB : INTEGER [in]
> The leading dimension of the array AB.  LDAB >= KD+1.

B : COMPLEX array, dimension (LDB,NRHS) [in,out]
> On entry, the N-by-NRHS right hand side matrix B.
> On exit, if INFO = 0, the N-by-NRHS solution matrix X.

LDB : INTEGER [in]
> The leading dimension of the array B.  LDB >= max(1,N).

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
> > 0:  if INFO = i, the leading principal minor of order i
> of A is not positive, so the factorization could not
> be completed, and the solution has not been computed.
