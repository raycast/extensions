```fortran
subroutine dgtsvx (
        character fact,
        character trans,
        integer n,
        integer nrhs,
        double precision, dimension( * ) dl,
        double precision, dimension( * ) d,
        double precision, dimension( * ) du,
        double precision, dimension( * ) dlf,
        double precision, dimension( * ) df,
        double precision, dimension( * ) duf,
        double precision, dimension( * ) du2,
        integer, dimension( * ) ipiv,
        double precision, dimension( ldb, * ) b,
        integer ldb,
        double precision, dimension( ldx, * ) x,
        integer ldx,
        double precision rcond,
        double precision, dimension( * ) ferr,
        double precision, dimension( * ) berr,
        double precision, dimension( * ) work,
        integer, dimension( * ) iwork,
        integer info
)
```

DGTSVX uses the LU factorization to compute the solution to a real
system of linear equations A \* X = B or A\*\*T \* X = B,
where A is a tridiagonal matrix of order N and X and B are N-by-NRHS
matrices.

Error bounds on the solution and a condition estimate are also
provided.

## Parameters
FACT : CHARACTER\*1 [in]
> Specifies whether or not the factored form of A has been
> supplied on entry.
> = 'F':  DLF, DF, DUF, DU2, and IPIV contain the factored
> form of A; DL, D, DU, DLF, DF, DUF, DU2 and IPIV
> will not be modified.
> = 'N':  The matrix will be copied to DLF, DF, and DUF
> and factored.

TRANS : CHARACTER\*1 [in]
> Specifies the form of the system of equations:
> = 'N':  A \* X = B     (No transpose)
> = 'T':  A\*\*T \* X = B  (Transpose)
> = 'C':  A\*\*H \* X = B  (Conjugate transpose = Transpose)

N : INTEGER [in]
> The order of the matrix A.  N >= 0.

NRHS : INTEGER [in]
> The number of right hand sides, i.e., the number of columns
> of the matrix B.  NRHS >= 0.

DL : DOUBLE PRECISION array, dimension (N-1) [in]
> The (n-1) subdiagonal elements of A.

D : DOUBLE PRECISION array, dimension (N) [in]
> The n diagonal elements of A.

DU : DOUBLE PRECISION array, dimension (N-1) [in]
> The (n-1) superdiagonal elements of A.

DLF : DOUBLE PRECISION array, dimension (N-1) [in,out]
> If FACT = 'F', then DLF is an input argument and on entry
> contains the (n-1) multipliers that define the matrix L from
> the LU factorization of A as computed by DGTTRF.
> 
> If FACT = 'N', then DLF is an output argument and on exit
> contains the (n-1) multipliers that define the matrix L from
> the LU factorization of A.

DF : DOUBLE PRECISION array, dimension (N) [in,out]
> If FACT = 'F', then DF is an input argument and on entry
> contains the n diagonal elements of the upper triangular
> matrix U from the LU factorization of A.
> 
> If FACT = 'N', then DF is an output argument and on exit
> contains the n diagonal elements of the upper triangular
> matrix U from the LU factorization of A.

DUF : DOUBLE PRECISION array, dimension (N-1) [in,out]
> If FACT = 'F', then DUF is an input argument and on entry
> contains the (n-1) elements of the first superdiagonal of U.
> 
> If FACT = 'N', then DUF is an output argument and on exit
> contains the (n-1) elements of the first superdiagonal of U.

DU2 : DOUBLE PRECISION array, dimension (N-2) [in,out]
> If FACT = 'F', then DU2 is an input argument and on entry
> contains the (n-2) elements of the second superdiagonal of
> U.
> 
> If FACT = 'N', then DU2 is an output argument and on exit
> contains the (n-2) elements of the second superdiagonal of
> U.

IPIV : INTEGER array, dimension (N) [in,out]
> If FACT = 'F', then IPIV is an input argument and on entry
> contains the pivot indices from the LU factorization of A as
> computed by DGTTRF.
> 
> If FACT = 'N', then IPIV is an output argument and on exit
> contains the pivot indices from the LU factorization of A;
> row i of the matrix was interchanged with row IPIV(i).
> IPIV(i) will always be either i or i+1; IPIV(i) = i indicates
> a row interchange was not required.

B : DOUBLE PRECISION array, dimension (LDB,NRHS) [in]
> The N-by-NRHS right hand side matrix B.

LDB : INTEGER [in]
> The leading dimension of the array B.  LDB >= max(1,N).

X : DOUBLE PRECISION array, dimension (LDX,NRHS) [out]
> If INFO = 0 or INFO = N+1, the N-by-NRHS solution matrix X.

LDX : INTEGER [in]
> The leading dimension of the array X.  LDX >= max(1,N).

RCOND : DOUBLE PRECISION [out]
> The estimate of the reciprocal condition number of the matrix
> A.  If RCOND is less than the machine precision (in
> particular, if RCOND = 0), the matrix is singular to working
> precision.  This condition is indicated by a return code of
> INFO > 0.

FERR : DOUBLE PRECISION array, dimension (NRHS) [out]
> The estimated forward error bound for each solution vector
> X(j) (the j-th column of the solution matrix X).
> If XTRUE is the true solution corresponding to X(j), FERR(j)
> is an estimated upper bound for the magnitude of the largest
> element in (X(j) - XTRUE) divided by the magnitude of the
> largest element in X(j).  The estimate is as reliable as
> the estimate for RCOND, and is almost always a slight
> overestimate of the true error.

BERR : DOUBLE PRECISION array, dimension (NRHS) [out]
> The componentwise relative backward error of each solution
> vector X(j) (i.e., the smallest relative change in
> any element of A or B that makes X(j) an exact solution).

WORK : DOUBLE PRECISION array, dimension (3\*N) [out]

IWORK : INTEGER array, dimension (N) [out]

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
> > 0:  if INFO = i, and i is
> <= N:  U(i,i) is exactly zero.  The factorization
> has not been completed unless i = N, but the
> factor U is exactly singular, so the solution
> and error bounds could not be computed.
> RCOND = 0 is returned.
> = N+1: U is nonsingular, but RCOND is less than machine
> precision, meaning that the matrix is singular
> to working precision.  Nevertheless, the
> solution and error bounds are computed because
> there are a number of situations where the
> computed solution can be more accurate than the
> value of RCOND would suggest.
