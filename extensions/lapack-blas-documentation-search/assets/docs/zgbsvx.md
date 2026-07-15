```fortran
subroutine zgbsvx (
        character fact,
        character trans,
        integer n,
        integer kl,
        integer ku,
        integer nrhs,
        complex*16, dimension( ldab, * ) ab,
        integer ldab,
        complex*16, dimension( ldafb, * ) afb,
        integer ldafb,
        integer, dimension( * ) ipiv,
        character equed,
        double precision, dimension( * ) r,
        double precision, dimension( * ) c,
        complex*16, dimension( ldb, * ) b,
        integer ldb,
        complex*16, dimension( ldx, * ) x,
        integer ldx,
        double precision rcond,
        double precision, dimension( * ) ferr,
        double precision, dimension( * ) berr,
        complex*16, dimension( * ) work,
        double precision, dimension( * ) rwork,
        integer info
)
```

ZGBSVX uses the LU factorization to compute the solution to a complex
system of linear equations A \* X = B, A\*\*T \* X = B, or A\*\*H \* X = B,
where A is a band matrix of order N with KL subdiagonals and KU
superdiagonals, and X and B are N-by-NRHS matrices.

Error bounds on the solution and a condition estimate are also
provided.

## Parameters
FACT : CHARACTER\*1 [in]
> Specifies whether or not the factored form of the matrix A is
> supplied on entry, and if not, whether the matrix A should be
> equilibrated before it is factored.
> = 'F':  On entry, AFB and IPIV contain the factored form of
> A.  If EQUED is not 'N', the matrix A has been
> equilibrated with scaling factors given by R and C.
> AB, AFB, and IPIV are not modified.
> = 'N':  The matrix A will be copied to AFB and factored.
> = 'E':  The matrix A will be equilibrated if necessary, then
> copied to AFB and factored.

TRANS : CHARACTER\*1 [in]
> Specifies the form of the system of equations.
> = 'N':  A \* X = B     (No transpose)
> = 'T':  A\*\*T \* X = B  (Transpose)
> = 'C':  A\*\*H \* X = B  (Conjugate transpose)

N : INTEGER [in]
> The number of linear equations, i.e., the order of the
> matrix A.  N >= 0.

KL : INTEGER [in]
> The number of subdiagonals within the band of A.  KL >= 0.

KU : INTEGER [in]
> The number of superdiagonals within the band of A.  KU >= 0.

NRHS : INTEGER [in]
> The number of right hand sides, i.e., the number of columns
> of the matrices B and X.  NRHS >= 0.

AB : COMPLEX\*16 array, dimension (LDAB,N) [in,out]
> On entry, the matrix A in band storage, in rows 1 to KL+KU+1.
> The j-th column of A is stored in the j-th column of the
> array AB as follows:
> AB(KU+1+i-j,j) = A(i,j) for max(1,j-KU)<=i<=min(N,j+kl)
> 
> If FACT = 'F' and EQUED is not 'N', then A must have been
> equilibrated by the scaling factors in R and/or C.  AB is not
> modified if FACT = 'F' or 'N', or if FACT = 'E' and
> EQUED = 'N' on exit.
> 
> On exit, if EQUED .ne. 'N', A is scaled as follows:
> EQUED = 'R':  A := diag(R) \* A
> EQUED = 'C':  A := A \* diag(C)
> EQUED = 'B':  A := diag(R) \* A \* diag(C).

LDAB : INTEGER [in]
> The leading dimension of the array AB.  LDAB >= KL+KU+1.

AFB : COMPLEX\*16 array, dimension (LDAFB,N) [in,out]
> If FACT = 'F', then AFB is an input argument and on entry
> contains details of the LU factorization of the band matrix
> A, as computed by ZGBTRF.  U is stored as an upper triangular
> band matrix with KL+KU superdiagonals in rows 1 to KL+KU+1,
> and the multipliers used during the factorization are stored
> in rows KL+KU+2 to 2\*KL+KU+1.  If EQUED .ne. 'N', then AFB is
> the factored form of the equilibrated matrix A.
> 
> If FACT = 'N', then AFB is an output argument and on exit
> returns details of the LU factorization of A.
> 
> If FACT = 'E', then AFB is an output argument and on exit
> returns details of the LU factorization of the equilibrated
> matrix A (see the description of AB for the form of the
> equilibrated matrix).

LDAFB : INTEGER [in]
> The leading dimension of the array AFB.  LDAFB >= 2\*KL+KU+1.

IPIV : INTEGER array, dimension (N) [in,out]
> If FACT = 'F', then IPIV is an input argument and on entry
> contains the pivot indices from the factorization A = L\*U
> as computed by ZGBTRF; row i of the matrix was interchanged
> with row IPIV(i).
> 
> If FACT = 'N', then IPIV is an output argument and on exit
> contains the pivot indices from the factorization A = L\*U
> of the original matrix A.
> 
> If FACT = 'E', then IPIV is an output argument and on exit
> contains the pivot indices from the factorization A = L\*U
> of the equilibrated matrix A.

EQUED : CHARACTER\*1 [in,out]
> Specifies the form of equilibration that was done.
> = 'N':  No equilibration (always true if FACT = 'N').
> = 'R':  Row equilibration, i.e., A has been premultiplied by
> diag(R).
> = 'C':  Column equilibration, i.e., A has been postmultiplied
> by diag(C).
> = 'B':  Both row and column equilibration, i.e., A has been
> replaced by diag(R) \* A \* diag(C).
> EQUED is an input argument if FACT = 'F'; otherwise, it is an
> output argument.

R : DOUBLE PRECISION array, dimension (N) [in,out]
> The row scale factors for A.  If EQUED = 'R' or 'B', A is
> multiplied on the left by diag(R); if EQUED = 'N' or 'C', R
> is not accessed.  R is an input argument if FACT = 'F';
> otherwise, R is an output argument.  If FACT = 'F' and
> EQUED = 'R' or 'B', each element of R must be positive.

C : DOUBLE PRECISION array, dimension (N) [in,out]
> The column scale factors for A.  If EQUED = 'C' or 'B', A is
> multiplied on the right by diag(C); if EQUED = 'N' or 'R', C
> is not accessed.  C is an input argument if FACT = 'F';
> otherwise, C is an output argument.  If FACT = 'F' and
> EQUED = 'C' or 'B', each element of C must be positive.

B : COMPLEX\*16 array, dimension (LDB,NRHS) [in,out]
> On entry, the right hand side matrix B.
> On exit,
> if EQUED = 'N', B is not modified;
> if TRANS = 'N' and EQUED = 'R' or 'B', B is overwritten by
> diag(R)\*B;
> if TRANS = 'T' or 'C' and EQUED = 'C' or 'B', B is
> overwritten by diag(C)\*B.

LDB : INTEGER [in]
> The leading dimension of the array B.  LDB >= max(1,N).

X : COMPLEX\*16 array, dimension (LDX,NRHS) [out]
> If INFO = 0 or INFO = N+1, the N-by-NRHS solution matrix X
> to the original system of equations.  Note that A and B are
> modified on exit if EQUED .ne. 'N', and the solution to the
> equilibrated system is inv(diag(C))\*X if TRANS = 'N' and
> EQUED = 'C' or 'B', or inv(diag(R))\*X if TRANS = 'T' or 'C'
> and EQUED = 'R' or 'B'.

LDX : INTEGER [in]
> The leading dimension of the array X.  LDX >= max(1,N).

RCOND : DOUBLE PRECISION [out]
> The estimate of the reciprocal condition number of the matrix
> A after equilibration (if done).  If RCOND is less than the
> machine precision (in particular, if RCOND = 0), the matrix
> is singular to working precision.  This condition is
> indicated by a return code of INFO > 0.

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

WORK : COMPLEX\*16 array, dimension (2\*N) [out]

RWORK : DOUBLE PRECISION array, dimension (MAX(1,N)) [out]
> On exit, RWORK(1) contains the reciprocal pivot growth
> factor norm(A)/norm(U). The  norm is
> used. If RWORK(1) is much less than 1, then the stability
> of the LU factorization of the (equilibrated) matrix A
> could be poor. This also means that the solution X, condition
> estimator RCOND, and forward error bound FERR could be
> unreliable. If factorization fails with 0<INFO<=N, then
> RWORK(1) contains the reciprocal pivot growth factor for the
> leading INFO columns of A.

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
> > 0:  if INFO = i, and i is
> <= N:  U(i,i) is exactly zero.  The factorization
> has been completed, but the factor U is exactly
> singular, so the solution and error bounds
> could not be computed. RCOND = 0 is returned.
> = N+1: U is nonsingular, but RCOND is less than machine
> precision, meaning that the matrix is singular
> to working precision.  Nevertheless, the
> solution and error bounds are computed because
> there are a number of situations where the
> computed solution can be more accurate than the
> value of RCOND would suggest.
