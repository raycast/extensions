```fortran
subroutine dppsv (
        character uplo,
        integer n,
        integer nrhs,
        double precision, dimension( * ) ap,
        double precision, dimension( ldb, * ) b,
        integer ldb,
        integer info
)
```

DPPSV computes the solution to a real system of linear equations
A \* X = B,
where A is an N-by-N symmetric positive definite matrix stored in
packed format and X and B are N-by-NRHS matrices.

The Cholesky decomposition is used to factor A as
A = U\*\*T\* U,  if UPLO = 'U', or
A = L \* L\*\*T,  if UPLO = 'L',
where U is an upper triangular matrix and L is a lower triangular
matrix.  The factored form of A is then used to solve the system of
equations A \* X = B.

## Parameters
UPLO : CHARACTER\*1 [in]
> = 'U':  Upper triangle of A is stored;
> = 'L':  Lower triangle of A is stored.

N : INTEGER [in]
> The number of linear equations, i.e., the order of the
> matrix A.  N >= 0.

NRHS : INTEGER [in]
> The number of right hand sides, i.e., the number of columns
> of the matrix B.  NRHS >= 0.

AP : DOUBLE PRECISION array, dimension (N\*(N+1)/2) [in,out]
> On entry, the upper or lower triangle of the symmetric matrix
> A, packed columnwise in a linear array.  The j-th column of A
> is stored in the array AP as follows:
> if UPLO = 'U', AP(i + (j-1)\*j/2) = A(i,j) for 1<=i<=j;
> if UPLO = 'L', AP(i + (j-1)\*(2n-j)/2) = A(i,j) for j<=i<=n.
> See below for further details.
> 
> On exit, if INFO = 0, the factor U or L from the Cholesky
> factorization A = U\*\*T\*U or A = L\*L\*\*T, in the same storage
> format as A.

B : DOUBLE PRECISION array, dimension (LDB,NRHS) [in,out]
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
