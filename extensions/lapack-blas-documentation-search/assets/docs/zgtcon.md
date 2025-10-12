```fortran
subroutine zgtcon (
        character norm,
        integer n,
        complex*16, dimension( * ) dl,
        complex*16, dimension( * ) d,
        complex*16, dimension( * ) du,
        complex*16, dimension( * ) du2,
        integer, dimension( * ) ipiv,
        double precision anorm,
        double precision rcond,
        complex*16, dimension( * ) work,
        integer info
)
```

ZGTCON estimates the reciprocal of the condition number of a complex
tridiagonal matrix A using the LU factorization as computed by
ZGTTRF.

An estimate is obtained for norm(inv(A)), and the reciprocal of the
condition number is computed as RCOND = 1 / (ANORM \* norm(inv(A))).

## Parameters
NORM : CHARACTER\*1 [in]
> Specifies whether the 1-norm condition number or the
> infinity-norm condition number is required:
> = '1' or 'O':  1-norm;
> = 'I':         Infinity-norm.

N : INTEGER [in]
> The order of the matrix A.  N >= 0.

DL : COMPLEX\*16 array, dimension (N-1) [in]
> The (n-1) multipliers that define the matrix L from the
> LU factorization of A as computed by ZGTTRF.

D : COMPLEX\*16 array, dimension (N) [in]
> The n diagonal elements of the upper triangular matrix U from
> the LU factorization of A.

DU : COMPLEX\*16 array, dimension (N-1) [in]
> The (n-1) elements of the first superdiagonal of U.

DU2 : COMPLEX\*16 array, dimension (N-2) [in]
> The (n-2) elements of the second superdiagonal of U.

IPIV : INTEGER array, dimension (N) [in]
> The pivot indices; for 1 <= i <= n, row i of the matrix was
> interchanged with row IPIV(i).  IPIV(i) will always be either
> i or i+1; IPIV(i) = i indicates a row interchange was not
> required.

ANORM : DOUBLE PRECISION [in]
> If NORM = '1' or 'O', the 1-norm of the original matrix A.
> If NORM = 'I', the infinity-norm of the original matrix A.

RCOND : DOUBLE PRECISION [out]
> The reciprocal of the condition number of the matrix A,
> computed as RCOND = 1/(ANORM \* AINVNM), where AINVNM is an
> estimate of the 1-norm of inv(A) computed in this routine.

WORK : COMPLEX\*16 array, dimension (2\*N) [out]

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
